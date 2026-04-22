use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs::metadata;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct SystemTimestamp {
    pub secs_since_epoch: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct FileMeta {
    pub created_at: Option<SystemTimestamp>,
    pub updated_at: Option<SystemTimestamp>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub children: Option<Vec<FileNode>>,
    pub is_directory: bool,
    pub is_file: bool,
    pub is_symlink: bool,
    pub meta: Option<FileMeta>,
}

#[derive(Debug, Default)]
struct NodeBuilder {
    is_directory: bool,
    is_markdown_file: bool,
    children: BTreeMap<String, NodeBuilder>,
}

impl NodeBuilder {
    fn insert_directory(&mut self, segments: &[String]) {
        if let Some((head, tail)) = segments.split_first() {
            let child = self.children.entry(head.clone()).or_default();
            child.is_directory = true;
            child.insert_directory(tail);
        }
    }

    fn insert_markdown_file(&mut self, segments: &[String]) {
        if let Some((head, tail)) = segments.split_first() {
            let child = self.children.entry(head.clone()).or_default();

            if tail.is_empty() {
                child.is_markdown_file = true;
                return;
            }

            child.is_directory = true;
            child.insert_markdown_file(tail);
        }
    }
}

pub fn scan_markdown_tree(root: &Path) -> Result<Vec<FileNode>, String> {
    let directory_paths = Arc::new(Mutex::new(Vec::new()));
    let markdown_paths = Arc::new(Mutex::new(Vec::new()));
    let root = root.to_path_buf();

    ignore::WalkBuilder::new(&root)
        .hidden(false)
        .git_ignore(false)
        .git_exclude(false)
        .ignore(false)
        .parents(false)
        .build_parallel()
        .run(|| {
            let root = root.clone();
            let directory_paths = Arc::clone(&directory_paths);
            let markdown_paths = Arc::clone(&markdown_paths);

            Box::new(move |entry| {
                let Ok(entry) = entry else {
                    return ignore::WalkState::Continue;
                };

                let Some(file_type) = entry.file_type() else {
                    return ignore::WalkState::Continue;
                };

                let path = entry.path();
                let Ok(relative_path) = path.strip_prefix(&root) else {
                    return ignore::WalkState::Continue;
                };

                if relative_path.as_os_str().is_empty() {
                    return ignore::WalkState::Continue;
                }

                if file_type.is_dir() {
                    if let Ok(mut paths) = directory_paths.lock() {
                        paths.push(relative_path.to_string_lossy().into_owned());
                    }
                    return ignore::WalkState::Continue;
                }

                if !file_type.is_file()
                    || path.extension().and_then(|ext| ext.to_str()) != Some("md")
                {
                    return ignore::WalkState::Continue;
                }

                if let Ok(mut paths) = markdown_paths.lock() {
                    paths.push(relative_path.to_string_lossy().into_owned());
                }

                ignore::WalkState::Continue
            })
        });

    let directory_paths = directory_paths
        .lock()
        .map_err(|_| "Failed to collect directory paths".to_string())?;
    let markdown_paths = markdown_paths
        .lock()
        .map_err(|_| "Failed to collect markdown paths".to_string())?;

    Ok(build_tree_from_relative_paths(
        &root,
        directory_paths.iter().map(String::as_str).collect(),
        markdown_paths.iter().map(String::as_str).collect(),
    ))
}

fn path_segments(path: &Path) -> Vec<String> {
    path.components()
        .map(|component| component.as_os_str().to_string_lossy().into_owned())
        .collect()
}

fn build_nodes(root: &Path, builder: &NodeBuilder) -> Vec<FileNode> {
    builder
        .children
        .iter()
        .map(|(name, child)| build_node(root, name, child))
        .collect()
}

pub fn build_tree_from_relative_paths(
    root: &Path,
    directory_paths: Vec<&str>,
    markdown_paths: Vec<&str>,
) -> Vec<FileNode> {
    let mut builder = NodeBuilder::default();

    for relative_path in directory_paths {
        let segments = path_segments(Path::new(relative_path));
        if !segments.is_empty() {
            builder.insert_directory(&segments);
        }
    }

    for relative_path in markdown_paths {
        let segments = path_segments(Path::new(relative_path));
        if !segments.is_empty() {
            builder.insert_markdown_file(&segments);
        }
    }

    build_nodes(root, &builder)
}

fn build_node(root: &Path, name: &str, builder: &NodeBuilder) -> FileNode {
    let path = root.join(name);

    if builder.is_markdown_file {
        return FileNode {
            name: name.to_string(),
            path: path.to_string_lossy().into_owned(),
            children: None,
            is_directory: false,
            is_file: true,
            is_symlink: path.symlink_metadata().is_ok_and(|meta| meta.file_type().is_symlink()),
            meta: file_metadata(&path),
        };
    }

    FileNode {
        name: name.to_string(),
        path: path.to_string_lossy().into_owned(),
        children: Some(build_nodes(&path, builder)),
        is_directory: true,
        is_file: false,
        is_symlink: path.symlink_metadata().is_ok_and(|meta| meta.file_type().is_symlink()),
        meta: file_metadata(&path),
    }
}

pub fn file_metadata(path: &Path) -> Option<FileMeta> {
    let meta = metadata(path).ok()?;

    Some(FileMeta {
        updated_at: meta.modified().ok().and_then(system_time_to_timestamp),
        created_at: meta.created().ok().and_then(system_time_to_timestamp),
    })
}

fn system_time_to_timestamp(time: SystemTime) -> Option<SystemTimestamp> {
    let secs_since_epoch = time.duration_since(UNIX_EPOCH).ok()?.as_secs();
    Some(SystemTimestamp { secs_since_epoch })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{create_dir_all, remove_dir_all, write};
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn builds_directory_tree_from_markdown_paths() {
        let root = PathBuf::from("/tmp/project");
        let nodes = build_tree_from_relative_paths(
            &root,
            vec!["docs", "docs/nested"],
            vec!["README.md", "docs/guide.md", "docs/nested/tips.md"],
        );

        assert_eq!(nodes.len(), 2);
        assert_eq!(nodes[0].name, "README.md");
        assert!(nodes[0].is_file);
        assert_eq!(nodes[0].path, "/tmp/project/README.md");

        assert_eq!(nodes[1].name, "docs");
        assert!(nodes[1].is_directory);
        assert_eq!(nodes[1].path, "/tmp/project/docs");

        let docs_children = nodes[1].children.as_ref().expect("docs children");
        assert_eq!(docs_children.len(), 2);
        assert_eq!(docs_children[0].name, "guide.md");
        assert_eq!(docs_children[1].name, "nested");
        assert!(docs_children[1].is_directory);

        let nested_children = docs_children[1]
            .children
            .as_ref()
            .expect("nested children");
        assert_eq!(nested_children.len(), 1);
        assert_eq!(nested_children[0].name, "tips.md");
        assert!(nested_children[0].is_file);
    }

    #[test]
    fn scan_keeps_empty_directories_visible() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time")
            .as_nanos();
        let root = std::env::temp_dir().join(format!("marker-file-tree-{unique}"));
        let docs_dir = root.join("docs");
        let nested_empty_dir = docs_dir.join("nested-empty");
        let empty_dir = root.join("empty-dir");
        let notes_file = docs_dir.join("notes.md");

        create_dir_all(&nested_empty_dir).expect("create nested empty dir");
        create_dir_all(&empty_dir).expect("create empty dir");
        write(&notes_file, "# notes").expect("write markdown file");

        let nodes = scan_markdown_tree(&root).expect("scan file tree");

        remove_dir_all(&root).expect("cleanup temp dir");

        assert_eq!(nodes.len(), 2);
        assert_eq!(nodes[0].name, "docs");
        assert_eq!(nodes[1].name, "empty-dir");
        assert!(nodes[1].is_directory);
        assert_eq!(nodes[1].children.as_ref().map(Vec::len), Some(0));

        let docs_children = nodes[0].children.as_ref().expect("docs children");
        assert_eq!(docs_children.len(), 2);
        assert_eq!(docs_children[0].name, "nested-empty");
        assert!(docs_children[0].is_directory);
        assert_eq!(docs_children[0].children.as_ref().map(Vec::len), Some(0));
        assert_eq!(docs_children[1].name, "notes.md");
    }
}
